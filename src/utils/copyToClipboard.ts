import toast from "react-hot-toast";

export const copyToClipboard = (text: string): boolean => {
  try {
    navigator.clipboard.writeText(text);
  } catch (err: any) {
    // iPhone does not grant clipboard permissions with this error.
    if (err.message === "NotAllowedError: Write permission denied.") {
      toast.error("Clipboard permission denied", {
        position: "bottom-right",
      });
      return false;
    }
    throw err;
  }

  toast.success("Copied to clipboard", {
    position: "bottom-right",
  });
  return true;
};
