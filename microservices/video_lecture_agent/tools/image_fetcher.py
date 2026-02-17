import requests


WIKI_API = "https://commons.wikimedia.org/w/api.php"

HEADERS = {
    "User-Agent": "lecture-agent/1.0 (educational project; contact: example@email.com)"
}


def simplify_topic(topic: str) -> str:
    words = topic.lower().split()
    return " ".join([w for w in words if len(w) > 3][:5])


def fetch_images(topics: list[str], per_topic: int = 2) -> list[str]:
    images = []

    for topic in topics:
        try:
            topic = simplify_topic(topic)

            params = {
                "action": "query",
                "generator": "search",
                "gsrsearch": topic,
                "gsrnamespace": 6,
                "gsrlimit": per_topic,
                "prop": "imageinfo",
                "iiprop": "url",
                "format": "json",
            }

            r = requests.get(
                WIKI_API,
                params=params,
                headers=HEADERS,
                timeout=10
            )

            if r.status_code != 200:
                print("Wikimedia HTTP error:", r.status_code)
                continue

            data = r.json()

            pages = data.get("query", {}).get("pages", {})

            for page in pages.values():
                info = page.get("imageinfo")
                if info:
                    images.append(info[0]["url"])

        except Exception as e:
            print("Image fetch error:", str(e))

    return images
