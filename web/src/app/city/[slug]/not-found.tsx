import Link from "next/link";

export default function CityNotFound() {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold mb-4">City Not Found</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        We couldn&apos;t find the city you&apos;re looking for.
      </p>
      <Link
        href="/"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}
