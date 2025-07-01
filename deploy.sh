#!/bin/bash
set -e

echo "Step 1: Installing dependencies..."
npm install

echo "Step 2: Building Next.js app..."
npm run build

echo "Step 3: Starting production server..."
npm run start