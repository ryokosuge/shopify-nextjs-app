"use client";

import { useSearchParams } from "next/navigation";
import { FC, PropsWithChildren } from "react";

type Props = PropsWithChildren & {};

const ShopifyAppBridgeLayout: FC<Props> = ({ children }) => {
  const searchParams = useSearchParams();
  console.log(searchParams);
  return <>{children}</>;
};

export default ShopifyAppBridgeLayout;
