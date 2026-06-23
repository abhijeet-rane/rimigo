import { House, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/providers/AuthProviders";
import { useSidebarContext } from "@/components/layouts/SideBarLayout";
import clsx from "clsx";

type AuthActionButtonProps = {
  fallbackRoute: string;
  className?: string;
  iconClassName?: string;
};

const HamburgerBtn = ({
  fallbackRoute,
  className,
  iconClassName = "w-6 h-6 text-grey-2",
}: AuthActionButtonProps) => {
  const { isAuthenticated } = useAuth();
  const { openSidebar } = useSidebarContext();
  const navigate = useNavigate();

  const handleClick = () => {
    if (isAuthenticated) {
      openSidebar();
    } else {
      navigate(fallbackRoute);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        "h-10 w-10 rounded-full flex justify-center items-center transition-colors",
        className
      )}
    >
      {isAuthenticated ? (
        <Menu className={iconClassName} />
      ) : (
        <House className={iconClassName} />
      )}
    </button>
  );
};

export default HamburgerBtn;
