import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Link, PresentationIcon } from "lucide-react";

export default function SalesKitMaterials() {
  return (
    <Card>
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <CardTitle>Sales Kit Materials</CardTitle>
        <CardDescription>Resources to help your referrals</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          <li className="py-3 flex items-center">
            <FileText className="text-red-500 h-5 w-5 mr-3" />
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
              ColorMedia Product Brochure
            </a>
          </li>
          <li className="py-3 flex items-center">
            <FileText className="text-red-500 h-5 w-5 mr-3" />
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
              Pricing Guide 2024
            </a>
          </li>
          <li className="py-3 flex items-center">
            <Link className="text-primary-500 h-5 w-5 mr-3" />
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
              Company Introduction Video
            </a>
          </li>
          <li className="py-3 flex items-center">
            <PresentationIcon className="text-primary-500 h-5 w-5 mr-3" />
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
              Sales Presentation Template
            </a>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
