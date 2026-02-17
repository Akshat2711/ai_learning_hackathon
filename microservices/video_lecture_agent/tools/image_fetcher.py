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
    # Define allowed extensions
    valid_extensions = ('.jpg', '.jpeg', '.png')

    for topic in topics:
        try:
            topic = simplify_topic(topic)

            params = {
                "action": "query",
                "generator": "search",
                # Adding 'filetype:bitmap' helps narrow results to images in search
                "gsrsearch": f"{topic} filetype:bitmap", 
                "gsrnamespace": 6,
                "gsrlimit": per_topic * 2, # Fetch more to account for filtered items
                "prop": "imageinfo",
                "iiprop": "url",
                "format": "json",
            }

            r = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=10)
            if r.status_code != 200: continue

            data = r.json()
            pages = data.get("query", {}).get("pages", {})

            for page in pages.values():
                info = page.get("imageinfo")
                if info:
                    url = info[0]["url"]
                    # Filter: Only append if the URL ends with a valid image extension
                    if url.lower().endswith(valid_extensions):
                        images.append(url)
                
                # Stop if we've reached the desired count for this specific topic
                if len(images) >= per_topic:
                    break

        except Exception as e:
            print("Image fetch error:", str(e))

    return images[:len(topics) * per_topic] # Final trim to match requested count