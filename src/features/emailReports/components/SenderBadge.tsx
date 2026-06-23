import { useEmailAccount } from '../hooks/useEmailAccount';

export function SenderBadge() {
  const { account, removeAccount } = useEmailAccount();
  if (!account) return null;

  const initials = account.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-[10px] shrink-0">
        {initials}
      </div>
      <span className="text-gray-600 hidden sm:block truncate max-w-[100px]">{account.name}</span>
      <button
        onClick={removeAccount}
        className="cursor-pointer text-gray-400 hover:text-gray-600 text-[10px] underline shrink-0"
      >
        trocar
      </button>
    </div>
  );
}
