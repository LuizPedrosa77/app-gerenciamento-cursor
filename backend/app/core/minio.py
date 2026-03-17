from minio import Minio
import os

def get_minio_client():
    return Minio(
        os.getenv("MINIO_ENDPOINT", "s3.painelzap.com"),
        access_key=os.getenv("MINIO_ACCESS_KEY"),
        secret_key=os.getenv("MINIO_SECRET_KEY"),
        secure=os.getenv("MINIO_USE_SSL", "true").lower() == "true"
    )
