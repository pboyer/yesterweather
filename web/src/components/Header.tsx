import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-slate-700 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <Link href="/" className="text-2xl font-bold">
              Yesterday&apos;s Weather
            </Link>
            <p className="text-slate-200 mt-1">
              Historical weather data from across the United States
            </p>
          </div>

          <nav className="mt-4 md:mt-0">
            <ul className="flex space-x-6">
              <li>
                <Link
                  href="/"
                  className="text-white hover:text-slate-300 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-white hover:text-slate-300 transition-colors"
                >
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
