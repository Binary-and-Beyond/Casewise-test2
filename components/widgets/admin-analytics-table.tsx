"use client";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  user: string;
  timeSpent: string;
  casesUploaded: number;
  mcqAttempted: number;
  mostQuestionsType: string;
}

interface AdminAnalyticsTableProps {
  analyticsData: AnalyticsData[];
}

export function AdminAnalyticsTable({
  analyticsData,
}: AdminAnalyticsTableProps) {
  return (
    <div className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Admin Analytics
        </h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Spent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cases Uploaded
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                MCQ Attempted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Most Questions Type
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {analyticsData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.user}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.timeSpent}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.casesUploaded}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.mcqAttempted}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.mostQuestionsType}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-6">
        <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2">
          Export
        </Button>
        <Button variant="outline" className="px-6 py-2 bg-transparent">
          Manage Users
        </Button>
      </div>
    </div>
  );
}
