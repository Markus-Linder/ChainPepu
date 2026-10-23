import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="mb-2 text-5xl font-bold">404</h1>
      <p className="mb-6 text-muted">That page does not exist.</p>
      <Link to="/" className="btn">Back to home</Link>
    </div>
  );
}
