# Yesterday's Weather - Web App

This is the Next.js web application for displaying historical weather data from the Yesterday's Weather API.

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
4. Update the `.env.local` file with your Supabase credentials
5. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install the Vercel CLI:

   ```bash
   npm install -g vercel
   ```

2. Log in to Vercel:

   ```bash
   vercel login
   ```

3. Deploy the project:

   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub Integration

1. Push your code to a GitHub repository
2. Log in to [Vercel](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure project settings:
   - Set the Framework Preset to "Next.js"
   - Configure the following environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
6. Click "Deploy"

## Environment Variables

The following environment variables need to be set in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Project Structure

- `app/`: Next.js app router pages and layouts
- `components/`: React components
- `lib/`: Utility functions and shared code
- `public/`: Static assets
- `services/`: API services and data fetching logic
- `types/`: TypeScript type definitions

## Features

- Comprehensive historical weather data for US cities
- Data collected from NOAA Climate Data Online API
- Mobile-responsive design
- Dark mode support
- City search with fuzzy matching:
  - Search by city name (e.g., "Chicago")
  - Search by state name or code (e.g., "Illinois" or "IL")
  - Search by zip code (e.g., "90210")
- Interactive weather charts
- SEO-optimized with metadata
- Internationalization support
- Supabase backend for reliable data storage

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework with server-side rendering
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Chart.js](https://www.chartjs.org/) - JavaScript charting library
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [date-fns](https://date-fns.org/) - JavaScript date utility library

## Google Crawlability

This application is designed to be crawlable by Google and other search engines:

- Uses server-side rendering and static generation for SEO
- Implements dynamic metadata for all pages
- Includes a sitemap and robots.txt
- Provides semantic HTML structure
- Contains appropriate accessibility attributes

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
