#!/bin/sh
set -eu

: "${AWS_ACCESS_KEY_ID:?missing AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?missing AWS_SECRET_ACCESS_KEY}"
: "${S3_ENDPOINT:?missing S3_ENDPOINT}"
: "${S3_BUCKET:?missing S3_BUCKET}"

KEY="command-center-rustfs-probe-$(date +%s)-$$.txt"

printf 'AiToEarn RustFS probe\n' > /tmp/source.txt

echo "RUSTFS_PROBE_START"

aws --endpoint-url "$S3_ENDPOINT" \
  s3api put-object \
  --bucket "$S3_BUCKET" \
  --key "$KEY" \
  --body /tmp/source.txt >/dev/null

echo "RUSTFS_PUT=PASS"

aws --endpoint-url "$S3_ENDPOINT" \
  s3api get-object \
  --bucket "$S3_BUCKET" \
  --key "$KEY" \
  /tmp/result.txt >/dev/null

echo "RUSTFS_GET=PASS"

cmp /tmp/source.txt /tmp/result.txt

echo "RUSTFS_CONTENT_INTEGRITY=PASS"

aws --endpoint-url "$S3_ENDPOINT" \
  s3api delete-object \
  --bucket "$S3_BUCKET" \
  --key "$KEY" >/dev/null

echo "RUSTFS_DELETE=PASS"

if aws --endpoint-url "$S3_ENDPOINT" \
  s3api head-object \
  --bucket "$S3_BUCKET" \
  --key "$KEY" >/dev/null 2>&1; then
  echo "RUSTFS_DELETE_VERIFY=FAIL"
  exit 1
fi

echo "RUSTFS_DELETE_VERIFY=PASS"
echo "RUSTFS_PROBE=PASS"

sleep 20
