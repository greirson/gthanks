interface ComponentLoaderProps {
  height?: number;
  message?: string;
}

export const ComponentLoader = ({ height = 200, message = 'Loading...' }: ComponentLoaderProps) => (
  <div className="flex animate-pulse items-center justify-center" style={{ minHeight: height }}>
    <div className="text-muted-foreground">{message}</div>
  </div>
);
