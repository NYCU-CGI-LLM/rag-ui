This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Before running the app, copy the `.env.example` file to `.env.local` and update the values as needed:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set the correct API server URL:

```env
API_SERVER_URL=http://your-api-server-address:8000
```

> **Note:** The app will not work correctly if `API_SERVER_URL` is not set.

## Production Build & Deployment

To deploy this app in production mode, follow these steps:

```bash
npm install
npm run build
npm run start
```

Alternatively, you can use the deployment script:

```bash
./deploy.sh
```

The production server will run at [http://localhost:3000](http://localhost:3000) by default.

> **Note:** Do not use `npm run dev` for production deployment. Always use the build & start commands as shown above.

## Docker Build & Deployment

To build and run this app using Docker:

1. Build the Docker image:

    ```bash
    docker build -t rag-ui-app:latest .
    ```

2. Run the container (using your local environment variables):

    ```bash
    docker run -d -p 3000:3000 --env-file .env.local rag-ui-app:latest
    ```

3. Check running containers:

    ```bash
    docker ps
    ```

4. View container logs:

    ```bash
    docker logs <container_id>
    ```

The app will be accessible at [http://localhost:3000](http://localhost:3000).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
