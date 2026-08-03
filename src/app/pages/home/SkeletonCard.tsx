export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="h-5 w-28 bg-gray-100 dark:bg-gray-800 rounded mb-3" />
      <div className="h-4 w-44 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
      <div className="h-4 w-36 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
      <div className="h-3 w-52 bg-gray-100 dark:bg-gray-800 rounded" />
    </div>
  );
}
