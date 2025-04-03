export async function GET(): Promise<Response> {
  // Only show environment debug in development
  if (process.env.NODE_ENV !== "development") {
    return new Response(
      JSON.stringify({
        message: "This API is only available in development mode",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Check if Supabase environment variables are set
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "Set"
      : "Missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "Set"
      : "Missing",
    NODE_ENV: process.env.NODE_ENV,
  };

  return new Response(
    JSON.stringify({
      message: "Environment variable status",
      environment: envStatus,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
