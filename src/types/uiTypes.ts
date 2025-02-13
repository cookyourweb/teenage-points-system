export type ButtonProps = {
  children: React.ReactNode; // Keep this for rendering button content
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};
