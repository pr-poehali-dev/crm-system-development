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
            login_val = body.get("login", "")
            password = body.get("password", "")
            group = body.get("group", "")

            if not full_name:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "ФИО обязательно"})}

            parts = full_name.split()
            last_name = parts[0] if len(parts) > 0 else ""
            first_name = parts[1] if len(parts) > 1 else ""
            middle_name = parts[2] if len(parts) > 2 else ""

            print(f"[create_subscriber] fullName={full_name!r} contract={contract!r} tariff={tariff_id!r}")

            # Шаг 1: GET страницы создания абонента — получаем форму с реальными именами полей
            create_url = LB_BASE + "?page=users/edit"
            req_get = urllib.request.Request(create_url)
            req_get.add_header("Cookie", get_cookies())
            req_get.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            with urllib.request.urlopen(req_get, timeout=15) as r:
                final_url = r.geturl()
                form_html = r.read().decode("utf-8", errors="replace")

            print(f"[create_subscriber] GET {create_url} -> {final_url} html_len={len(form_html)}")

            if "page=login" in final_url or ("login" in form_html[:500].lower() and len(form_html) < 500):
                return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"success": False, "error": "Сессия LightBilling истекла. Обновите LB_COUNTERSIGN."})}

            # Извлекаем все input-поля формы
            all_inputs = {}
            for m in re.finditer(r'<input([^>]*)>', form_html, re.IGNORECASE):
                tag_attrs = m.group(1)
                name_m = re.search(r'name=["\']([^"\']+)["\']', tag_attrs)
                val_m = re.search(r'value=["\']([^"\']*)["\']', tag_attrs)
                type_m = re.search(r'type=["\']([^"\']+)["\']', tag_attrs)
                if name_m:
                    all_inputs[name_m.group(1)] = {
                        "value": val_m.group(1) if val_m else "",
                        "type": type_m.group(1) if type_m else "text",
                    }

            # select-поля тоже собираем
            for m in re.finditer(r'<select([^>]*)>', form_html, re.IGNORECASE):
                tag_attrs = m.group(1)
                name_m = re.search(r'name=["\']([^"\']+)["\']', tag_attrs)
                if name_m and name_m.group(1) not in all_inputs:
                    all_inputs[name_m.group(1)] = {"value": "", "type": "select"}

            # action формы
            form_action_m = re.search(r'<form[^>]+action=["\']([^"\']*)["\']', form_html, re.IGNORECASE)
            form_action = form_action_m.group(1) if form_action_m else "?page=users/edit"
            print(f"[create_subscriber] form_action={form_action!r} inputs={list(all_inputs.keys())}")

            # Шаг 2: Собираем POST — берём все hidden-поля как есть, заполняем нужные
            post_fields = {}
            for name, info in all_inputs.items():
                if info["type"] == "hidden":
                    post_fields[name] = info["value"]

            # Динамически ищем имена полей ФИО
            def find_field(keys_hints):
                for name in all_inputs:
                    nl = name.lower()
                    if any(h in nl for h in keys_hints):
                        return name
                return None

            # LB использует поле "name" для полного ФИО
            f_name = find_field(["name", "имя", "фио"]) or "name"
            f_addr = find_field(["addr", "адр"]) or "address"
            f_phone = find_field(["phone", "тел", "mobile"]) or "phone"
            f_contract = find_field(["contract", "договор", "dogovor"]) or "contract"
            f_login = find_field(["login", "логин", "user"]) or "login"
            f_pass = find_field(["pass", "пароль", "pwd"]) or "password"
            f_group = find_field(["group", "группа"]) or "group"

            print(f"[create_subscriber] fields: name={f_name!r} addr={f_addr!r} group={f_group!r}")

            # Передаём ФИО целиком в поле name
            post_fields[f_name] = full_name
            post_fields[f_addr] = address
            post_fields[f_phone] = phone
            if contract:
                post_fields[f_contract] = contract
            if login_val:
                post_fields[f_login] = login_val
            if password:
                post_fields[f_pass] = password
            if group:
                post_fields[f_group] = group
            # action и page — обязательные поля LB
            post_fields["action"] = "add"
            post_fields["page"] = "users/edit"

            # Определяем URL для POST
            if form_action and form_action.startswith("http"):
                post_url = form_action
            elif form_action and form_action.startswith("?"):
                post_url = LB_BASE + form_action
            elif form_action:
                post_url = LB_BASE + "?" + form_action
            else:
                post_url = LB_BASE

            print(f"[create_subscriber] POST {post_url} fields={list(post_fields.keys())}")

            post_data = urllib.parse.urlencode(post_fields).encode("utf-8")
            req_post = urllib.request.Request(post_url, data=post_data, method="POST")
            req_post.add_header("Cookie", get_cookies())
            req_post.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            req_post.add_header("Content-Type", "application/x-www-form-urlencoded")
            req_post.add_header("Referer", create_url)

            with urllib.request.urlopen(req_post, timeout=15) as resp:
                resp_url = resp.geturl()
                resp_html = resp.read().decode("utf-8", errors="replace")

            print(f"[create_subscriber] resp_url={resp_url!r} resp_len={len(resp_html)}")
            print(f"[create_subscriber] resp_preview={resp_html[:500]!r}")

            # Ищем ID нового абонента в redirect URL: ?page=users/view&id=XXXXX
            new_id = ""
            id_m = re.search(r'page=users[/\\]view[^&]*&id=(\d+)', resp_url)
            if id_m:
                new_id = id_m.group(1)
                print(f"[create_subscriber] got id from redirect: {new_id!r}")

            # Если нет — ищем в HTML ответа
            if not new_id:
                id_m = re.search(r'page=users[/\\]view[^&]*&id=(\d+)', resp_html)
                if id_m:
                    new_id = id_m.group(1)
                    print(f"[create_subscriber] got id from html: {new_id!r}")

            # Последний шанс — ищем по договору/имени в списке
            if not new_id:
                search_params = {"limit": "20", "search": contract if contract else parts[0] if parts else full_name}
                search_html = lb_request("", search_params)
                subs = parse_subscribers_html(search_html)
                for s in subs:
                    s_contract = s.get("contractNumber", "").strip()
                    s_name = s.get("fullName", "").lower()
                    s_id = s.get("lb_id", "")
                    if not s_id:
                        continue
                    if contract and s_contract == contract.strip():
                        new_id = s_id
                        break
                    if parts and parts[0].lower() in s_name:
                        new_id = s_id
                        break
                if not new_id and subs:
                    best = max(subs, key=lambda x: int(x.get("lb_id", "0")) if x.get("lb_id", "").isdigit() else 0)
                    new_id = best.get("lb_id", "")
                print(f"[create_subscriber] got id from search: {new_id!r}")

            # Назначаем тариф отдельным запросом (тариф — отдельная страница в LB)
            tariff_assigned = False
            if new_id and tariff_id:
                try:
                    tariff_url = LB_BASE + f"?page=users/user-tariff&id={new_id}&id_tariff={tariff_id}&operation=add"
                    print(f"[create_subscriber] assign tariff: GET {tariff_url}")
                    req_tariff = urllib.request.Request(tariff_url)
                    req_tariff.add_header("Cookie", get_cookies())
                    req_tariff.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    req_tariff.add_header("Referer", LB_BASE + f"?page=users/view&id={new_id}")
                    with urllib.request.urlopen(req_tariff, timeout=10) as r:
                        tariff_resp = r.read().decode("utf-8", errors="replace")
                    tariff_assigned = True
                    print(f"[create_subscriber] tariff assigned, resp_len={len(tariff_resp)}")
                except Exception as e:
                    print(f"[create_subscriber] tariff assign failed: {e!r}")

            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({
                    "success": True,
                    "lb_id": new_id,
                    "tariff_assigned": tariff_assigned,
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

        elif action == "subscriber_tariffs":
            # Тарифы абонента со страницы users/view
            sub_id = params.get("id", "")
            if not sub_id:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "id обязателен"})}
            html = lb_request(f"?page=users/view&id={sub_id}")
            if 'page=login' in html:
                return {"statusCode": 401, "headers": cors_headers, "body": json.dumps({"error": "Сессия истекла"})}

            print(f"[subscriber_tariffs] html_len={len(html)}")

            tariffs_found = []

            # Стратегия 1: ищем строки таблицы содержащие id_tariff= (удаление тарифа)
            # В LB тарифы абонента обычно в таблице с ссылками ?page=users/user-tariff&id=SUB&id_tariff=T&operation=del
            rows_with_tariff = re.findall(
                r'<tr[^>]*>(.*?)</tr>',
                html, re.DOTALL
            )
            for row in rows_with_tariff:
                if 'id_tariff=' not in row and 'user-tariff' not in row:
                    continue
                t_id_m = re.search(r'id_tariff=(\d+)', row)
                t_id = t_id_m.group(1) if t_id_m else ""
                cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
                texts = [strip_tags(c).strip() for c in cells]
                texts = [t for t in texts if t and len(t) > 1]
                if not texts:
                    continue
                # Первый непустой текст — название тарифа
                name = texts[0]
                # Ищем цену — число с возможным знаком
                price = ""
                date_val = ""
                for t in texts[1:]:
                    clean = t.replace(',', '.').replace(' ', '').replace('\xa0', '')
                    if re.match(r'^-?\d+\.?\d*$', clean) and not price:
                        price = t
                    elif re.match(r'\d{2}\.\d{2}\.\d{4}', t) and not date_val:
                        date_val = t
                tariffs_found.append({
                    "id": t_id,
                    "name": name,
                    "price": price,
                    "date": date_val,
                    "raw": texts,
                })

            # Стратегия 2: ищем блок с заголовком "тариф" и следующую таблицу
            if not tariffs_found:
                tariff_section_m = re.search(
                    r'(?:<[^>]+>[^<]*[Тт]ариф[^<]*</[^>]+>)\s*(.*?)\s*(?=<(?:h[2-6]|div\s+class=["\'][^"\']*(?:panel|card|block)))',
                    html, re.DOTALL
                )
                if tariff_section_m:
                    section = tariff_section_m.group(1)
                    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', section, re.DOTALL)
                    for row in rows:
                        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
                        texts = [strip_tags(c).strip() for c in cells]
                        texts = [t for t in texts if t]
                        if len(texts) >= 1 and texts[0]:
                            t_id_m = re.search(r'id_tariff=(\d+)', row)
                            tariffs_found.append({
                                "id": t_id_m.group(1) if t_id_m else "",
                                "name": texts[0],
                                "price": texts[1] if len(texts) > 1 else "",
                                "date": texts[2] if len(texts) > 2 else "",
                                "raw": texts,
                            })

            print(f"[subscriber_tariffs] found={len(tariffs_found)} tariffs")
            if tariffs_found:
                print(f"[subscriber_tariffs] first={tariffs_found[0]}")

            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({"tariffs": tariffs_found, "sub_id": sub_id}, ensure_ascii=False),
            }

        elif action == "add_tariff":
            # Добавить тариф абоненту: GET ?page=users/user-tariff&id=SUB_ID&id_tariff=TARIFF_ID&operation=add
            sub_id = params.get("id", "")
            tariff_id_val = params.get("tariff_id", "")
            if not sub_id or not tariff_id_val:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "id и tariff_id обязательны"})}
            tariff_url = LB_BASE + f"?page=users/user-tariff&id={sub_id}&id_tariff={tariff_id_val}&operation=add"
            req_t = urllib.request.Request(tariff_url)
            req_t.add_header("Cookie", get_cookies())
            req_t.add_header("User-Agent", "Mozilla/5.0")
            req_t.add_header("Referer", LB_BASE + f"?page=users/view&id={sub_id}")
            with urllib.request.urlopen(req_t, timeout=10) as r:
                r.read()
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({"success": True, "sub_id": sub_id, "tariff_id": tariff_id_val}, ensure_ascii=False),
            }

        elif action == "promised_payment":
            # Обещанный платёж: GET/POST ?page=users/promised&id=SUB_ID
            sub_id = params.get("id", "")
            days = params.get("days", "")
            summ = params.get("summ", "")  # сумма обещанного платежа (если требуется)
            if not sub_id:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "id обязателен"})}
            promised_url = LB_BASE + f"?page=users/promised&id={sub_id}"
            html = lb_request(f"?page=users/promised&id={sub_id}")
            if 'page=login' in html:
                return {"statusCode": 401, "headers": cors_headers, "body": json.dumps({"error": "Сессия истекла"})}

            print(f"[promised_payment] sub_id={sub_id} days={days!r} summ={summ!r}")
            print(f"[promised_payment] html_preview={html[:800]!r}")

            # Парсим ВСЕ поля формы
            all_inputs = {}
            for m in re.finditer(r'<input([^>]*)/?>', html, re.IGNORECASE):
                tag_attrs = m.group(1)
                name_m = re.search(r'name=["\']([^"\']+)["\']', tag_attrs)
                val_m = re.search(r'value=["\']([^"\']*)["\']', tag_attrs)
                type_m = re.search(r'type=["\']([^"\']+)["\']', tag_attrs)
                if name_m:
                    all_inputs[name_m.group(1)] = {
                        "value": val_m.group(1) if val_m else "",
                        "type": (type_m.group(1).lower() if type_m else "text"),
                    }
            # Парсим select-поля
            all_selects = {}
            for sel_m in re.finditer(r'<select[^>]*name=["\']([^"\']+)["\'][^>]*>(.*?)</select>', html, re.DOTALL | re.IGNORECASE):
                sel_name = sel_m.group(1)
                options_raw = sel_m.group(2)
                opts = []
                selected_val = ""
                for opt in re.finditer(r'<option([^>]*)>([^<]*)', options_raw):
                    opt_attrs = opt.group(1)
                    opt_val_m = re.search(r'value=["\']?([^"\'>\s]*)["\']?', opt_attrs)
                    opt_val = opt_val_m.group(1) if opt_val_m else ""
                    opt_label = opt.group(2).strip()
                    is_selected = 'selected' in opt_attrs.lower()
                    opts.append({"value": opt_val, "label": opt_label, "selected": is_selected})
                    if is_selected:
                        selected_val = opt_val
                all_selects[sel_name] = {"options": opts, "selected": selected_val}

            print(f"[promised_payment] inputs={list(all_inputs.keys())} selects={list(all_selects.keys())}")

            form_action_m = re.search(r'<form[^>]+action=["\']([^"\']*)["\']', html, re.IGNORECASE)
            form_action = form_action_m.group(1) if form_action_m else ""

            # Текущий активный обещанный платёж
            current = ""
            active_m = re.search(r'(\d{2}\.\d{2}\.\d{4})', html)
            if active_m:
                current = active_m.group(1)
            active_summ_m = re.search(r'(\d+[\.,]\d+)\s*(?:руб|₽)', html)
            if not active_summ_m:
                active_summ_m = re.search(r'(?:сумма|sum)[^:]*:\s*([^\s<]+)', html, re.IGNORECASE)
            current_summ = active_summ_m.group(1) if active_summ_m else ""

            # Если передали days — отправляем POST
            if days:
                post_fields = {k: v["value"] for k, v in all_inputs.items() if v["type"] == "hidden"}
                # Подставляем значения select по умолчанию
                for sel_name, sel_data in all_selects.items():
                    if sel_data["selected"]:
                        post_fields[sel_name] = sel_data["selected"]
                    elif sel_data["options"]:
                        post_fields[sel_name] = sel_data["options"][0]["value"]

                # Ищем поле для дней
                days_field = None
                for name in list(all_inputs.keys()) + list(all_selects.keys()):
                    nl = name.lower()
                    if any(k in nl for k in ["day", "дн", "period", "срок", "count"]):
                        days_field = name
                        break
                if days_field:
                    post_fields[days_field] = str(days)
                else:
                    # Пробуем первый select если есть
                    if all_selects:
                        first_sel = list(all_selects.keys())[0]
                        post_fields[first_sel] = str(days)
                    else:
                        post_fields["days"] = str(days)

                # Поле суммы если требуется
                if summ:
                    for name in all_inputs:
                        nl = name.lower()
                        if any(k in nl for k in ["sum", "summ", "amount", "сумм"]):
                            post_fields[name] = str(summ)
                            break
                    else:
                        post_fields["summ"] = str(summ)

                post_fields["id"] = sub_id
                # action=save или submit
                if "action" not in post_fields:
                    post_fields["action"] = "save"

                if form_action and form_action.startswith("?"):
                    post_url = LB_BASE + form_action
                elif form_action and form_action.startswith("http"):
                    post_url = form_action
                else:
                    post_url = promised_url

                print(f"[promised_payment] POST {post_url} fields={post_fields}")
                post_data = urllib.parse.urlencode(post_fields).encode("utf-8")
                req_post = urllib.request.Request(post_url, data=post_data, method="POST")
                req_post.add_header("Cookie", get_cookies())
                req_post.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                req_post.add_header("Content-Type", "application/x-www-form-urlencoded")
                req_post.add_header("Referer", promised_url)
                with urllib.request.urlopen(req_post, timeout=15) as resp:
                    resp_url = resp.geturl()
                    resp_html = resp.read().decode("utf-8", errors="replace")
                print(f"[promised_payment] POST resp_url={resp_url!r} resp_len={len(resp_html)}")
                print(f"[promised_payment] POST resp_preview={resp_html[:500]!r}")
                success = 'page=login' not in resp_url and 'error' not in resp_html[:300].lower()
                return {
                    "statusCode": 200,
                    "headers": cors_headers,
                    "body": json.dumps({
                        "success": success,
                        "sub_id": sub_id,
                        "days": days,
                        "debug_post_fields": list(post_fields.keys()),
                        "debug_resp_url": resp_url,
                    }, ensure_ascii=False),
                }

            # GET: возвращаем форму для фронта
            # Собираем варианты для select (дни)
            days_options = []
            summ_options = []
            for sel_name, sel_data in all_selects.items():
                nl = sel_name.lower()
                if any(k in nl for k in ["day", "дн", "period", "count"]):
                    days_options = sel_data["options"]
                elif any(k in nl for k in ["sum", "summ", "amount"]):
                    summ_options = sel_data["options"]
            # Если дни не нашли через название — берём первый select
            if not days_options and all_selects:
                first_sel = list(all_selects.values())[0]
                days_options = first_sel["options"]

            has_summ_field = any(
                any(k in n.lower() for k in ["sum", "summ", "amount", "сумм"])
                for n in list(all_inputs.keys()) + list(all_selects.keys())
            )

            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({
                    "sub_id": sub_id,
                    "days_options": days_options,
                    "summ_options": summ_options,
                    "has_summ_field": has_summ_field,
                    "current_promised": current,
                    "current_summ": current_summ,
                    "all_fields": list(all_inputs.keys()),
                    "all_selects": list(all_selects.keys()),
                }, ensure_ascii=False),
            }

        elif action == "lb_payments":
            # История платежей из LB: ?page=payments&operation=search&contract=CONTRACT
            contract = params.get("contract", "")
            sub_id = params.get("id", "")
            if not contract and not sub_id:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "contract или id обязателен"})}
            if not contract and sub_id:
                view_html = lb_request(f"?page=users/view&id={sub_id}")
                # Ищем номер договора в тексте страницы
                contract_m = re.search(r'(?:договор|contract)[^\d]*(\d[\d\-]+)', view_html, re.IGNORECASE)
                if contract_m:
                    contract = contract_m.group(1).strip()

            pay_html = lb_request(f"?page=payments&operation=search&contract={urllib.parse.quote(contract)}&back=%3Fpage%3Dusers%2Fview%26id%3D{sub_id}")
            if 'page=login' in pay_html:
                return {"statusCode": 401, "headers": cors_headers, "body": json.dumps({"error": "Сессия истекла"})}

            print(f"[lb_payments] contract={contract!r} pay_html_len={len(pay_html)}")

            payments = []
            # Определяем заголовки таблицы — чтобы знать какая колонка что значит
            table_m = re.search(r'<table[^>]*id=["\']keywords["\'][^>]*>(.*?)</table>', pay_html, re.DOTALL)
            if not table_m:
                table_m = re.search(r'<table[^>]*>(.*?)</table>', pay_html, re.DOTALL)
            if table_m:
                all_rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_m.group(1), re.DOTALL)
                headers = []
                data_rows = []
                for i, row in enumerate(all_rows):
                    th_cells = re.findall(r'<th[^>]*>(.*?)</th>', row, re.DOTALL)
                    td_cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
                    if th_cells and not headers:
                        headers = [strip_tags(c).strip().lower() for c in th_cells]
                        print(f"[lb_payments] headers={headers}")
                    elif td_cells:
                        data_rows.append(td_cells)

                for cells in data_rows:
                    texts = [strip_tags(c).strip() for c in cells]
                    if not any(texts):
                        continue
                    # Если есть заголовки — сопоставляем по позиции
                    date_val = ""
                    amount_val = ""
                    operator_val = ""
                    comment_val = ""
                    if headers:
                        for idx, h in enumerate(headers):
                            if idx >= len(texts):
                                break
                            val = texts[idx]
                            if not val:
                                continue
                            if any(k in h for k in ["дат", "date", "врем", "time"]) and not date_val:
                                date_val = val
                            elif any(k in h for k in ["сумм", "sum", "amount", "платёж", "payment"]) and not amount_val:
                                amount_val = val
                            elif any(k in h for k in ["оператор", "operator", "кассир", "кто", "менедж", "manager", "user"]) and not operator_val:
                                operator_val = val
                            elif any(k in h for k in ["коммент", "comment", "примечан", "note", "описан"]) and not comment_val:
                                comment_val = val
                    # Fallback: определяем по содержимому
                    if not date_val and not amount_val:
                        for t in texts:
                            if not t:
                                continue
                            if re.match(r'\d{2}\.\d{2}\.\d{4}', t) and not date_val:
                                date_val = t
                            elif re.match(r'^-?\d+[\.,\s]?\d*$', t.replace('\xa0', '').replace(' ', '')) and not amount_val:
                                amount_val = t
                            elif not operator_val and t and t not in (date_val, amount_val):
                                operator_val = t
                            elif not comment_val and t and t not in (date_val, amount_val, operator_val):
                                comment_val = t

                    # Нормализуем сумму
                    amount_clean = amount_val.replace('\xa0', '').replace(' ', '').replace(',', '.') if amount_val else ""
                    try:
                        amount_float = float(amount_clean) if amount_clean else None
                    except:
                        amount_float = None

                    if amount_val or date_val:
                        payments.append({
                            "date": date_val,
                            "amount": amount_val,
                            "amount_float": amount_float,
                            "operator": operator_val,
                            "comment": comment_val,
                            "raw": texts,
                        })

            print(f"[lb_payments] payments_count={len(payments)}")
            if payments:
                print(f"[lb_payments] first_payment={payments[0]}")

            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({"payments": payments, "contract": contract, "total": len(payments)}, ensure_ascii=False),
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