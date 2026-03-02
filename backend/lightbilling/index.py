"""
Прокси для LightBilling API.
Получает данные абонентов, детали абонента и выполняет поиск.
"""
import os
import json
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
        if tag == "table" and "users" in attrs_dict.get("id", ""):
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


def parse_subscribers_html(html: str) -> list:
    """Парсит HTML списка абонентов"""
    parser = SubscribersParser()
    parser.feed(html)
    
    result = []
    for row in parser.subscribers:
        if len(row) < 2:
            continue
        
        sub_id = ""
        if row[0].get("link"):
            sub_id = extract_subscriber_id(row[0]["link"])
        
        cells = [c.get("text", "") for c in row]
        
        subscriber = {
            "id": sub_id or cells[0],
            "fullName": cells[0] if cells else "",
            "contractNumber": cells[1] if len(cells) > 1 else "",
            "address": cells[2] if len(cells) > 2 else "",
            "tariff": cells[3] if len(cells) > 3 else "",
            "balance": 0,
            "status": "active",
            "phone": cells[5] if len(cells) > 5 else "",
            "connectDate": "",
            "ipAddress": "",
            "lb_id": sub_id,
        }
        
        # Баланс
        for i, cell in enumerate(cells):
            if "₽" in cell or "руб" in cell.lower() or (i > 1 and any(c.isdigit() for c in cell)):
                try:
                    bal_str = cell.replace("₽", "").replace("руб", "").replace(" ", "").replace(",", ".").strip()
                    subscriber["balance"] = float(bal_str)
                    break
                except:
                    pass
        
        # Статус
        for cell in cells:
            if any(w in cell.lower() for w in ["актив", "приост", "отключ", "suspend", "active"]):
                subscriber["status"] = map_status(cell)
                break
        
        result.append(subscriber)
    
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
