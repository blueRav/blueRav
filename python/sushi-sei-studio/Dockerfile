FROM node:22-slim AS frontend
WORKDIR /build
COPY frontend/package*.json frontend/
RUN npm --prefix frontend ci --no-audit --no-fund
COPY frontend frontend
COPY data data
RUN npm --prefix frontend run build
FROM python:3.13-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN python -m pip install --no-cache-dir -r backend/requirements.txt && useradd --uid 10001 appuser
COPY backend backend
COPY data data
COPY --from=frontend /build/frontend/dist frontend/dist
RUN mkdir -p /data && chown -R appuser:appuser /app /data
ENV SUSHI_DATABASE=/data/sushi-sei.db
USER appuser
WORKDIR /app/backend
EXPOSE 8000
CMD ["python","-m","uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
