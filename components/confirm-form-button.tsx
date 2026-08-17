'use client';

import type { ReactNode } from 'react';

type ConfirmFormButtonProps = {
  action: () => Promise<void>;
  confirmMessage: string;
  children: ReactNode;
  className?: string;
};

export function ConfirmFormButton({
  action,
  confirmMessage,
  children,
  className,
}: ConfirmFormButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
