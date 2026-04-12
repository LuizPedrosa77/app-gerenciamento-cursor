from minio import Minio
import os

def get_minio_client():
    return Minio(
        os.getenv("MINIO_ENDPOINT", "s3.testedev.online"),
        access_key=os.getenv("MINIO_ACCESS_KEY"),
        secret_key=os.getenv("MINIO_SECRET_KEY"),
        secure=os.getenv("MINIO_USE_SSL", "true").lower() == "true"
    )


def ensure_bucket_exists(client: Minio, bucket_name: str) -> None:
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)
    # Public read policy for uploaded assets (screenshots)
    policy = f"""
{{
  "Version": "2012-10-17",
  "Statement": [
    {{
      "Effect": "Allow",
      "Principal": {{"AWS": ["*"]}},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::{bucket_name}/*"]
    }}
  ]
}}
""".strip()
    try:
        client.set_bucket_policy(bucket_name, policy)
    except Exception:
        # Best-effort: if policy can't be applied here, uploads still proceed.
        pass
