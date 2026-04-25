import { useState, type ReactNode, type MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useWallet } from "@/web3/WalletProvider";
import { WalletGateModal } from "@/web3/WalletGateModal";

type Props = {
  to?: string;
  className?: string;
  children: ReactNode;
  // If provided, navigate here after unlock; else just close modal
  navigateOnUnlock?: boolean;
};

/** Click intercept: opens the wallet gate if wallet hasn't paid; otherwise navigates. */
export function PlayButton({ to = "/play", className, children, navigateOnUnlock = true }: Props) {
  const w = useWallet();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // If admin already known, go straight in
    if (w.isAdmin) {
      navigate({ to });
      return;
    }
    if (w.paid) {
      navigate({ to });
      return;
    }
    // If we have an address but haven't confirmed access, check role + paid status
    if (w.address) {
      const [role, isPaid] = await Promise.all([
        w.checkRole(),
        w.checkPaidStatus(),
      ]);
      if (role === "admin" || isPaid) {
        navigate({ to });
        return;
      }
    }
    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {children}
      </button>
      <WalletGateModal
        open={open}
        onClose={() => setOpen(false)}
        onUnlocked={() => {
          if (navigateOnUnlock) {
            // Small delay so the user sees the success state
            setTimeout(() => {
              setOpen(false);
              navigate({ to });
            }, 600);
          }
        }}
      />
    </>
  );
}
