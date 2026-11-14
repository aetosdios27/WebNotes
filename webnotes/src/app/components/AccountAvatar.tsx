"use client";

import { Avatar } from "@base-ui/react/avatar";

type Account = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function AccountAvatar({
  account,
  size,
}: {
  account: Account;
  size: number;
}) {
  const initial = (account.name || account.email || "A")
    .slice(0, 1)
    .toUpperCase();
  return (
    <Avatar.Root
      className="account-photo"
      style={{ width: size, height: size }}
    >
      {account.image && (
        // Google photo URLs refuse requests that carry a referrer.
        <Avatar.Image
          src={account.image}
          alt=""
          referrerPolicy="no-referrer"
          width={size}
          height={size}
        />
      )}
      <Avatar.Fallback>{initial}</Avatar.Fallback>
    </Avatar.Root>
  );
}
