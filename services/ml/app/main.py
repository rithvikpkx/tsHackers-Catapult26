from fastapi import FastAPI

app = FastAPI(title="grind-ml-placeholder")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "mode": "placeholder",
        "message": "Grind v1 keeps prediction and decomposition logic inside the Next.js app.",
    }
