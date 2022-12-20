import "../styles/globals.css";
import ShopifyAppBridgeLayout from "./ShopifyAppBridgeLayout";
import { useSearchParams } from "next/navigation";

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <html>
      <body>
        <ShopifyAppBridgeLayout>{children}</ShopifyAppBridgeLayout>
      </body>
    </html>
  );
};

export default Layout;
