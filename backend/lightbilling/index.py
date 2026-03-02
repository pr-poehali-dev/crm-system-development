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