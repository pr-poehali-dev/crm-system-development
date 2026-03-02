"""
Прокси для LightBilling API.
Получает данные абонентов, детали абонента и выполняет поиск.
"""
import os
import json
import re
import urllib.request
import urllib.parse
from html.parser import HTMLParser


LB_BASE = "https://api.lightbilling.cloud/manager/"
LB_LOGIN = "Unitel"


def get_cookies():
    countersign = os.environ.get("LB_COUNTERSIGN", "")
    return f"login={LB_LOGIN}; countersign={countersign}"


def lb_request(path: str, params: dict = None) -> str:
    url = LB_BASE
    if params:
        url += "?" + urllib.parse.urlencode(params)
    elif path:
        url += path
    
    req = urllib.request.Request(url)
    req.add_header("Cookie", get_cookies())
    req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    req.add_header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
    req.add_header("Accept-Language", "ru-RU,ru;q=0.9,en;q=0.8")
    
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


class SubscribersParser(HTMLParser):
    """Парсер таблицы абонентов LightBilling"""
    
    def __init__(self):
        super().__init__()
        self.subscribers = []
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.current_row = []
        self.current_cell = ""
        self.row_attrs = {}
        self.header_done = False
        self.cell_count = 0
        self.current_link = ""
        self.in_link = False
    
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "table" and attrs_dict.get("id") == "keywords":
            self.in_table = True
        if self.in_table and tag == "tr":
            self.in_row = True
            self.current_row = []
            self.row_attrs = attrs_dict
            self.cell_count = 0
        if self.in_row and tag in ("td", "th"):
            self.in_cell = True
            self.current_cell = ""
        if self.in_cell and tag == "a":
            self.in_link = True
            self.current_link = attrs_dict.get("href", "")
    
    def handle_endtag(self, tag):
        if tag == "table" and self.in_table:
            self.in_table = False
        if self.in_table and tag == "tr" and self.in_row:
            self.in_row = False
            if self.header_done and len(self.current_row) >= 4:
                self.subscribers.append(self.current_row[:])
            elif not self.header_done and len(self.current_row) > 0:
                self.header_done = True
        if self.in_row and tag in ("td", "th"):
            self.in_cell = False
            self.current_row.append({
                "text": self.current_cell.strip(),
                "link": self.current_link,
            })
            self.current_cell = ""
            self.current_link = ""
            self.in_link = False
            self.cell_count += 1
        if tag == "a":
            self.in_link = False
    
    def handle_data(self, data):
        if self.in_cell:
            self.current_cell += data


class SubscriberDetailParser(HTMLParser):
    """Парсер страницы детального просмотра абонента"""
    
    def __init__(self):
        super().__init__()
        self.fields = {}
        self.in_detail = False
        self.in_label = False
        self.in_value = False
        self.current_label = ""
        self.current_value = ""
        self.balance = ""
        self.in_balance = False
        self.tariff = ""
        self.status = ""
        self.title = ""
        self.in_title = False
    
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        cls = attrs_dict.get("class", "")
        
        if tag in ("h1", "h2") and "name" in cls:
            self.in_title = True
        if "balance" in cls or "wallet" in cls:
            self.in_balance = True
        if tag == "tr":
            self.current_label = ""
            self.current_value = ""
            self.in_label = False
            self.in_value = False
        if tag == "th" or (tag == "td" and not self.in_value):
            if not self.in_label:
                self.in_label = True
            else:
                self.in_label = False
                self.in_value = True
    
    def handle_endtag(self, tag):
        if tag in ("h1", "h2"):
            self.in_title = False
        if tag == "tr" and self.current_label:
            self.fields[self.current_label.strip()] = self.current_value.strip()
            self.current_label = ""
            self.current_value = ""
        if self.in_balance and tag in ("div", "span", "td"):
            self.in_balance = False
    
    def handle_data(self, data):
        data = data.strip()
        if not data:
            return
        if self.in_title:
            self.title += data
        if self.in_balance:
            self.balance += data
        if self.in_label:
            self.current_label += data
        elif self.in_value:
            self.current_value += data


def extract_subscriber_id(link: str) -> str:
    """Извлекает ID абонента из ссылки вида ?page=users/view&id=12345"""
    if "id=" in link:
        parts = link.split("id=")
        if len(parts) > 1:
            return parts[1].split("&")[0]
    return ""


def map_status(status_text: str) -> str:
    t = status_text.lower()
    if any(w in t for w in ["актив", "active", "включ"]):
        return "active"
    if any(w in t for w in ["приост", "suspend", "заморож"]):
        return "suspended"
    return "terminated"


def strip_tags(html: str) -> str:
    """Удаляет все HTML-теги, возвращает чистый текст"""
    clean = re.sub(r'<[^>]+>', ' ', html)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def parse_subscribers_html(html: str) -> list:
    """
    Парсит HTML таблицы id='keywords' из LightBilling.
    Структура строки:
      td[0] — ID (ссылка на /view&id=XXXX) + статус через class online-cell/online-cell-disabled
      td[1] — номер договора
      td[2] — скрытый логин (hidden-login, пропускаем)
      td[3] — ФИО (текст внутри тега, может быть data-tooltip)
      td[4..N] — адрес, тариф, телефон, баланс и т.д.
    """
    # Найдём таблицу keywords
    table_match = re.search(r'<table[^>]*id=["\']keywords["\'][^>]*>(.*?)</table>', html, re.DOTALL)
    if not table_match:
        return []
    
    table_html = table_match.group(1)
    
    # Все строки tr
    rows = re.findall(r'<tr([^>]*)>(.*?)</tr>', table_html, re.DOTALL)
    
    result = []
    for row_attrs, row_html in rows:
        # Все ячейки td
        cells_raw = re.findall(r'<td([^>]*)>(.*?)</td>', row_html, re.DOTALL)
        if len(cells_raw) < 3:
            continue
        
        # td[0]: ID абонента + статус онлайн
        td0_attrs, td0_content = cells_raw[0]
        lb_id = ""
        id_match = re.search(r'id=(\d+)', td0_content)
        if id_match:
            lb_id = id_match.group(1)
        
        # Статус по классу ячейки
        status = "active"
        if "disabled" in td0_attrs or "offline" in td0_attrs:
            status = "suspended"
        
        # td[1]: номер договора
        contract = strip_tags(cells_raw[1][1]).strip()
        
        # td[3]: ФИО (td[2] — hidden-login, пропускаем)
        full_name = ""
        if len(cells_raw) > 3:
            td3_content = cells_raw[3][1]
            # Вариант 1: <a data-tooltip="..."> ФИО <img...>
            tooltip_match = re.search(r'data-tooltip=["\'][^"\']*["\'][^>]*>\s*([^<\n\r]+)', td3_content)
            if tooltip_match:
                full_name = tooltip_match.group(1).strip()
            if not full_name:
                # Вариант 2: просто текст с возможными тегами внутри
                full_name = strip_tags(td3_content)
            # Убираем артефакты — оставляем только ФИО-часть (до первой ссылки/иконки)
            full_name = re.sub(r'\s+', ' ', full_name).strip()
            # Берём первые 3 слова если длиннее
            words = full_name.split()
            if len(words) > 5:
                full_name = ' '.join(words[:3])
        
        # td[4..N]: все остальные ячейки — собираем все тексты для диагностики
        extra = [strip_tags(cells_raw[i][1]) for i in range(4, len(cells_raw))]
        
        # Ищем баланс — ячейка с числом (содержит цифры и точку/запятую)
        balance_str = "0"
        balance_idx = -1
        for i, val in enumerate(extra):
            val_clean = val.replace(',', '.').replace(' ', '')
            if re.match(r'^-?\d+\.?\d*$', val_clean) and len(val_clean) > 0:
                balance_str = val_clean
                balance_idx = i
                break
        
        # ФИО уже извлечено из td[3], если нет — берём из extra как ФИО-похожую строку
        if not full_name or full_name == lb_id:
            for val in extra:
                parts = val.split()
                # ФИО обычно 2-3 слова, каждое с заглавной
                if 2 <= len(parts) <= 4 and all(p[0].isupper() for p in parts if p):
                    full_name = val
                    break
        
        # Адрес — ищем ячейку с "мкр", "ул", "д.", "кв" или цифрами
        address = ""
        for val in extra:
            if any(w in val.lower() for w in ["мкр", "ул.", "ул ", "д.", " кв", "пер.", "пр.", "пгт"]):
                address = val
                break
        
        # Тариф — строка без цифр, не ФИО, не адрес
        tariff = ""
        for val in extra:
            if val and val != address and val != full_name and not re.search(r'\d', val):
                if len(val.split()) <= 6:
                    tariff = val
                    break
        
        # Телефон — ищем по формату
        phone = ""
        for val in extra:
            if re.search(r'[\d\-\+\(\)]{7,}', val) and "мкр" not in val.lower():
                phone = val
                break
        
        # Парсим баланс
        balance = 0.0
        try:
            bal_clean = re.sub(r'[^\d.\-,]', '', balance_str.replace(',', '.'))
            if bal_clean:
                balance = float(bal_clean)
        except:
            pass
        
        if not full_name and not lb_id:
            continue
        
        result.append({
            "id": lb_id,
            "lb_id": lb_id,
            "fullName": full_name or f"Абонент #{lb_id}",
            "contractNumber": contract,
            "address": address,
            "tariff": tariff,
            "balance": balance,
            "status": status,
            "phone": phone,
            "connectDate": "",
            "ipAddress": "",
        })
    
    return result


def handler(event: dict, context) -> dict:
    """
    Прокси-обработчик запросов к LightBilling API.
    Действия: search, subscribers, subscriber_detail
    """
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }
    
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}
    
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "subscribers")
    
    if not os.environ.get("LB_COUNTERSIGN"):
        return {
            "statusCode": 503,
            "headers": cors_headers,
            "body": json.dumps({"error": "LB_COUNTERSIGN не настроен", "subscribers": []}),
        }
    
    try:
        if action == "debug":
            html = lb_request("", {"group": "", "tariff": "0", "search": "", "limit": "5"})
            # Найдём все теги table
            table_tags = []
            i = 0
            while True:
                idx = html.find('<table', i)
                if idx == -1:
                    break
                end = html.find('>', idx)
                table_tags.append(html[idx:end+1])
                i = idx + 1
            # Найдём первые строки tr с td
            tr_samples = []
            i = 0
            count = 0
            while count < 3:
                idx = html.find('<tr', i)
                if idx == -1:
                    break
                end = html.find('</tr>', idx)
                row = html[idx:end+5] if end != -1 else html[idx:idx+2000]
                if '<td' in row:
                    tr_samples.append(row[:2000])
                    count += 1
                i = idx + 1
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({
                    "html_length": len(html),
                    "has_login": 'page=login' in html,
                    "table_tags": table_tags,
                    "tr_samples": tr_samples,
                }, ensure_ascii=False),
            }
        
        if action == "subscribers":
            search = params.get("search", "")
            limit = params.get("limit", "100")
            group = params.get("group", "")
            tariff = params.get("tariff", "0")
            
            lb_params = {
                "group": group,
                "tariff": tariff,
                "search": search,
                "limit": limit,
            }
            html = lb_request("", lb_params)
            
            # Проверяем редирект на логин
            if 'page=login' in html or 'name="login"' in html.lower():
                return {
                    "statusCode": 401,
                    "headers": cors_headers,
                    "body": json.dumps({"error": "Сессия LightBilling истекла. Обновите LB_COUNTERSIGN.", "subscribers": []}),
                }
            
            subscribers = parse_subscribers_html(html)
            
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({
                    "subscribers": subscribers,
                    "total": len(subscribers),
                    "search": search,
                }, ensure_ascii=False),
            }
        
        elif action == "subscriber_detail":
            sub_id = params.get("id", "")
            if not sub_id:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "id обязателен"})}
            
            html = lb_request(f"?page=users/view&id={sub_id}")
            
            if 'page=login' in html:
                return {
                    "statusCode": 401,
                    "headers": cors_headers,
                    "body": json.dumps({"error": "Сессия LightBilling истекла"}),
                }
            
            detail_parser = SubscriberDetailParser()
            detail_parser.feed(html)
            
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({
                    "id": sub_id,
                    "fields": detail_parser.fields,
                    "balance": detail_parser.balance,
                    "title": detail_parser.title,
                    "raw_available": True,
                }, ensure_ascii=False),
            }
        
        elif action == "tariffs":
            # Получаем тарифы из select-фильтра на главной странице абонентов
            html = lb_request("", {"group": "", "tariff": "0", "search": "", "limit": "1"})
            if 'page=login' in html:
                return {"statusCode": 401, "headers": cors_headers, "body": json.dumps({"error": "Сессия истекла"})}
            
            # Ищем select name="tariff"
            tariffs = []
            select_match = re.search(r'<select[^>]*name=["\']tariff["\'][^>]*>(.*?)</select>', html, re.DOTALL | re.IGNORECASE)
            if select_match:
                options = re.findall(r'<option[^>]*value=["\']?([^"\'>\s]*)["\']?[^>]*>\s*([^<\n\r]+)', select_match.group(1))
                # Пропускаем системные опции (0, 1, 2, 3, 4, 5 — это фильтры, не реальные тарифы)
                skip_ids = {"0", "1", "2", "3", "4", "5", ""}
                for val, label in options:
                    val = val.strip()
                    label = label.strip()
                    if val not in skip_ids and label:
                        tariffs.append({"id": val, "name": label})
            
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({"tariffs": tariffs, "total": len(tariffs)}, ensure_ascii=False),
            }
        
        elif action == "create_subscriber":
            # Создание нового абонента в LB
            body_raw = event.get("body", "{}")
            try:
                body = json.loads(body_raw) if body_raw else {}
            except:
                body = {}
            
            full_name = body.get("fullName", "")
            address = body.get("address", "")
            phone = body.get("phone", "")
            tariff_id = body.get("tariffId", "")
            contract = body.get("contractNumber", "")
            login = body.get("login", "")
            password = body.get("password", "")
            group = body.get("group", "Физические лица")
            
            if not full_name:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "ФИО обязательно"})}
            
            # Разбиваем ФИО
            parts = full_name.split()
            last_name = parts[0] if len(parts) > 0 else ""
            first_name = parts[1] if len(parts) > 1 else ""
            middle_name = parts[2] if len(parts) > 2 else ""
            
            post_fields = {
                "last_name": last_name,
                "first_name": first_name,
                "middle_name": middle_name,
                "address": address,
                "phone": phone,
                "tariff": tariff_id,
                "group": group,
                "action": "add",
                "page": "users/edit",
            }
            if contract:
                post_fields["contract"] = contract
            if login:
                post_fields["login"] = login
            if password:
                post_fields["password"] = password
            
            post_data = urllib.parse.urlencode(post_fields).encode("utf-8")
            
            req = urllib.request.Request(
                LB_BASE,
                data=post_data,
                method="POST",
            )
            req.add_header("Cookie", get_cookies())
            req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            req.add_header("Content-Type", "application/x-www-form-urlencoded")
            req.add_header("Referer", LB_BASE + "?page=users/edit")
            
            with urllib.request.urlopen(req, timeout=15) as resp:
                resp.read()
            
            # Ищем только что созданного абонента: запрашиваем список, отсортированный по ID desc
            # Новый абонент окажется в первых строках, сверяем по договору или фамилии
            new_id = ""
            search_params = {"limit": "20", "order": "id", "sort": "desc"}
            if contract:
                search_params["search"] = contract
            else:
                search_params["search"] = last_name
            
            search_html = lb_request("", search_params)
            subs = parse_subscribers_html(search_html)
            
            for s in subs:
                s_contract = s.get("contractNumber", "").strip()
                s_name = s.get("fullName", "").lower()
                s_id = s.get("lb_id", "")
                if not s_id:
                    continue
                # Точное совпадение по договору
                if contract and s_contract == contract.strip():
                    new_id = s_id
                    break
                # Совпадение по фамилии + имени
                if last_name.lower() in s_name and (not first_name or first_name.lower() in s_name):
                    new_id = s_id
                    break
            
            # Если совпадений нет — берём запись с наибольшим числовым ID (последняя созданная)
            if not new_id and subs:
                best = max(subs, key=lambda x: int(x.get("lb_id", "0")) if x.get("lb_id", "").isdigit() else 0)
                new_id = best.get("lb_id", "")
            
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({
                    "success": True,
                    "lb_id": new_id,
                    "message": "Абонент создан" if new_id else "Абонент создан (ID не определён)",
                }, ensure_ascii=False),
            }
        
        elif action == "add_payment":
            body_raw = event.get("body", "{}")
            try:
                body = json.loads(body_raw) if body_raw else {}
            except:
                body = {}

            contract = body.get("contract", "")
            lb_id = body.get("lb_id", "")
            amount = body.get("amount", 0)
            comment = body.get("comment", "Пополнение через CRM")

            print(f"[add_payment] contract={contract!r} lb_id={lb_id!r} amount={amount!r}")

            if not contract and not lb_id:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "contract или lb_id обязателен"})}
            if not amount or float(amount) <= 0:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "Сумма должна быть положительной"})}

            # Шаг 1: GET страницы оплаты — пробуем по lb_id (надёжнее), fallback на contract
            if lb_id:
                pay_url = LB_BASE + "?page=pay&id=" + urllib.parse.quote(str(lb_id))
            else:
                pay_url = LB_BASE + "?page=pay&contract=" + urllib.parse.quote(str(contract))
            print(f"[add_payment] GET {pay_url}")
            req_get = urllib.request.Request(pay_url)
            req_get.add_header("Cookie", get_cookies())
            req_get.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            with urllib.request.urlopen(req_get, timeout=15) as r:
                final_url = r.geturl()
                page_html = r.read().decode("utf-8", errors="replace")

            print(f"[add_payment] final_url={final_url!r} html_len={len(page_html)}")

            # Проверяем — не редирект ли на логин
            if "page=login" in final_url or ("login" in page_html[:500].lower() and len(page_html) < 500):
                print("[add_payment] REDIRECTED TO LOGIN — cookie expired!")
                return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"success": False, "error": "Сессия LightBilling истекла. Обновите LB_COUNTERSIGN."})}

            # Извлекаем ВСЕ input-поля формы (и hidden, и visible)
            all_inputs = {}
            for m in re.finditer(r'<input([^>]*)>', page_html, re.IGNORECASE):
                tag_attrs = m.group(1)
                name_m = re.search(r'name=["\']([^"\']+)["\']', tag_attrs)
                val_m = re.search(r'value=["\']([^"\']*)["\']', tag_attrs)
                type_m = re.search(r'type=["\']([^"\']+)["\']', tag_attrs)
                if name_m:
                    all_inputs[name_m.group(1)] = {
                        "value": val_m.group(1) if val_m else "",
                        "type": type_m.group(1) if type_m else "text",
                    }

            # Ищем action формы
            form_action_m = re.search(r'<form[^>]+action=["\']([^"\']*)["\']', page_html, re.IGNORECASE)
            form_action = form_action_m.group(1) if form_action_m else ""
            print(f"[add_payment] form_action={form_action!r} inputs={list(all_inputs.keys())}")

            # Формируем POST — берём все hidden, добавляем сумму и комментарий
            post_fields = {}
            for name, info in all_inputs.items():
                if info["type"] == "hidden":
                    post_fields[name] = info["value"]

            # Находим поля суммы и комментария (могут называться по-разному)
            # Смотрим все поля не-hidden чтобы найти нужные имена
            sum_field = None
            comment_field = None
            for name, info in all_inputs.items():
                if info["type"] != "hidden":
                    nl = name.lower()
                    if any(k in nl for k in ["sum", "summ", "amount", "сумм"]):
                        sum_field = name
                    if any(k in nl for k in ["comment", "comm", "note", "коммент"]):
                        comment_field = name

            print(f"[add_payment] sum_field={sum_field!r} comment_field={comment_field!r}")

            # Если не нашли через атрибуты — используем стандартные имена LB
            post_fields[sum_field or "summ"] = str(float(amount))
            if comment_field:
                post_fields[comment_field] = comment
            else:
                post_fields["comment"] = comment
            post_fields["contract"] = str(contract)

            # Определяем URL для POST
            if form_action and form_action.startswith("http"):
                post_url = form_action
            elif form_action and form_action.startswith("?"):
                post_url = LB_BASE + form_action
            elif form_action:
                post_url = LB_BASE + "?" + form_action
            else:
                post_url = LB_BASE

            print(f"[add_payment] POST {post_url} fields={list(post_fields.keys())}")

            post_data = urllib.parse.urlencode(post_fields).encode("utf-8")
            req_post = urllib.request.Request(post_url, data=post_data, method="POST")
            req_post.add_header("Cookie", get_cookies())
            req_post.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            req_post.add_header("Content-Type", "application/x-www-form-urlencoded")
            req_post.add_header("Referer", pay_url)

            with urllib.request.urlopen(req_post, timeout=15) as resp:
                resp_url = resp.geturl()
                resp_html = resp.read().decode("utf-8", errors="replace")

            print(f"[add_payment] resp_url={resp_url!r} resp_len={len(resp_html)}")
            # Логируем первые 1000 символов ответа для диагностики
            print(f"[add_payment] resp_preview={resp_html[:1000]!r}")

            success = True
            error_msg = None
            resp_lower = resp_html.lower()
            if any(w in resp_lower for w in ["error", "ошибка", "не найден", "not found", "invalid"]):
                err_m = re.search(r'class=["\'][^"\']*(?:error|alert)[^"\']*["\'][^>]*>\s*<[^>]*>\s*([^<]{5,200})', resp_html, re.IGNORECASE)
                if not err_m:
                    err_m = re.search(r'class=["\'][^"\']*(?:error|alert)[^"\']*["\'][^>]*>\s*([^<]{5,200})', resp_html, re.IGNORECASE)
                if err_m:
                    error_msg = err_m.group(1).strip()
                    success = False
                    print(f"[add_payment] error found: {error_msg!r}")

            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({
                    "success": success,
                    "lb_id": lb_id,
                    "contract": contract,
                    "amount": float(amount),
                    "error": error_msg,
                    "debug_inputs": list(all_inputs.keys()),
                    "debug_sum_field": sum_field,
                }, ensure_ascii=False),
            }

        else:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": f"Неизвестное действие: {action}"}),
            }
    
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e), "subscribers": []}),
        }