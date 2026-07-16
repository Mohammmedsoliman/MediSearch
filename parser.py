import requests
import urllib3
from bs4 import BeautifulSoup
from typing import List, Dict, Any

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class DrugDataProvider:
    def __init__(self):
        self.base_url = "https://drugeye.pharorg.com/drugeyeapp/android-search/drugeye-android-live-go.aspx"
        self.session = requests.Session()
        self.session.verify = False  
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Referer': self.base_url
        }

    def search_drug(self, query: str) -> List[Dict[str, Any]]:
        if not query or not query.strip():
            return []

        try:
            get_response = self.session.get(self.base_url, headers=self.headers, timeout=10)
            soup_get = BeautifulSoup(get_response.text, 'html.parser')

            viewstate = soup_get.find('input', {'id': '__VIEWSTATE'})
            viewstategen = soup_get.find('input', {'id': '__VIEWSTATEGENERATOR'})
            eventvalidation = soup_get.find('input', {'id': '__EVENTVALIDATION'})

            payload = {
                '__VIEWSTATE': viewstate['value'] if viewstate else '',
                '__VIEWSTATEGENERATOR': viewstategen['value'] if viewstategen else '',
                '__EVENTVALIDATION': eventvalidation['value'] if eventvalidation else '',
                'ttt': query.strip(),
                'b1': 'search'
            }

            post_response = self.session.post(self.base_url, data=payload, headers=self.headers, timeout=15)
            
            return self._parse_html(post_response.text, query)

        except Exception as e:
            return [{
                "brand_name": "حدث خطأ في الاتصال",
                "generic_name": "Exception",
                "category": "Error",
                "description": str(e),
                "side_effects": []
            }]

    def _parse_html(self, html_content: str, query: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html_content, 'html.parser')
        results = []

        table = soup.find('table', {'id': 'MyTable'})
        if not table:
            return []

        rows = table.find_all('tr')
        row_buffer = [] 

        for row in rows:
            row_text = row.get_text(separator='|', strip=True)
            
            if not row_text or "نتيجة البحث" in row_text:
                continue
                
            row_buffer.append(row)

            if "similars" in row_text.lower() and "alternatives" in row_text.lower():
                if len(row_buffer) >= 4:
                    name_price_cells = row_buffer[0].find_all('td')
                    brand_name = name_price_cells[0].get_text(strip=True) if len(name_price_cells) > 0 else "Unknown"
                    price = name_price_cells[1].get_text(strip=True) if len(name_price_cells) > 1 else "N/A"
                    
                    generic_name = row_buffer[1].get_text(strip=True) if len(row_buffer) > 1 else ""
                    
                    category = row_buffer[2].get_text(strip=True) if len(row_buffer) > 2 else ""
                    
                    company = row_buffer[3].get_text(strip=True) if len(row_buffer) > 3 else ""

                    results.append({
                        "brand_name": brand_name,
                        "generic_name": generic_name,
                        "category": category,
                        "description": f"Company: {company}",
                        "side_effects": [f"Price: {price} EGP"] 
                    })
                
                row_buffer = []

        return results