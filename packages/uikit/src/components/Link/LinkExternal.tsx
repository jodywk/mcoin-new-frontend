import React from "react";
import Link from "./Link";
import { LinkProps } from "./types";
import OpenNewIcon from "../Svg/Icons/OpenNew";
import BscScanIcon from "../Svg/Icons/MCoinScan";

const LinkExternal: React.FC<React.PropsWithChildren<LinkProps>> = ({ children, isBscScan = false, ...props }) => {
  return (
    <Link fontSize="16px" external {...props}>
      {children}
      {isBscScan ? (
        // <BscScanIcon color={props.color ? props.color : "primary"} ml="4px" />
        <OpenNewIcon color={props.color ? props.color : "primary"} ml="4px" />
      ) : (
        <OpenNewIcon color={props.color ? props.color : "primary"} ml="4px" />
      )}
    </Link>
  );
};

export default LinkExternal;
