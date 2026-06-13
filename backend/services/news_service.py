import os
import requests

NEWS_API_KEY = os.getenv(
    "NEWS_API_KEY"
)

def fetch_regulatory_news():

    query = (
        "GST India OR "
        "Income Tax India OR "
        "CBIC OR "
        "ICAI OR "
        "MCA India OR "
        "SEBI India OR "
        "RBI Circular"
    )

    response = requests.get(
        "https://newsapi.org/v2/everything",
        params={
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 20,
            "apiKey": NEWS_API_KEY
        }
    )

    return response.json()