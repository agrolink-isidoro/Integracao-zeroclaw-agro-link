FROM python:3.12-slim
WORKDIR /app

# Install system dependencies for PostgreSQL, PostGIS/GDAL and OCR/barcode libs
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    gcc \
    g++ \
    build-essential \
    zlib1g-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff5-dev \
    libzbar0 \
    libzbar-dev \
    tesseract-ocr \
    libtesseract-dev \
    libleptonica-dev \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL environment variables
ENV GDAL_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/
ENV GDAL_CONFIG=/usr/bin/gdal-config

# Install Python dependencies and ensure essential tooling is available
COPY requirements.txt .
# Rely on pinned versions in requirements.txt to avoid installing unpinned packages
RUN python -m pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .
RUN test -f docker-entrypoint.sh && chmod +x docker-entrypoint.sh
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
