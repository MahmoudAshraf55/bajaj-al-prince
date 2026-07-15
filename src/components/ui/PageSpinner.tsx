interface PageSpinnerProps {
  className?: string;
}

export default function PageSpinner({ className = '' }: PageSpinnerProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
