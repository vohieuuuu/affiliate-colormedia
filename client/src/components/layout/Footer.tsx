import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 shadow-inner mt-12">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:justify-start">
            <span className="text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} ColorMedia Affiliate
            </span>
          </div>
          <div className="mt-4 flex justify-center md:mt-0 space-x-6">
            <Link href="/commission-policy">
              <a className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Commission policy
              </a>
            </Link>
            <Link href="/terms-of-service">
              <a className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Terms of service
              </a>
            </Link>
            <Link href="/support">
              <a className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Contact support
              </a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
