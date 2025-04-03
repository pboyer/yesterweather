export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-900 mt-12 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Data provided by the NOAA Climate Data Online (CDO) API
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            © {new Date().getFullYear()} Yesterday&apos;s Weather. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
