export default function Loading() {
  return (
    <div aria-label="正在载入">
      <div className="skeleton mb-7 h-10 w-40 rounded-md" />
      <div className="skeleton h-[420px] w-full rounded-lg" />
    </div>
  );
}
