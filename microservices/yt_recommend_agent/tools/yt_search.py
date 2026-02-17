from youtubesearchpython import VideosSearch


def search_youtube_videos(topics: list[str], limit_per_topic: int = 1):
    """
    Search YouTube videos for given topics.

    Returns:
    [
        {
            "topic": "...",
            "title": "...",
            "url": "...",
            "channel": "..."
        }
    ]
    """

    results = []

    for topic in topics:
        try:
            search = VideosSearch(topic, limit=limit_per_topic)
            data = search.result().get("result", [])

            for video in data:
                results.append({
                    "topic": topic,
                    "title": video.get("title"),
                    "url": video.get("link"),
                    "channel": video.get("channel", {}).get("name")
                })

        except Exception as e:
            print("YT search error:", e)

    return results
