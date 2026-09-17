import Link from '@docusaurus/Link';

export default function ColoredLink({ to, color, children }) {
  return (
    <Link to={to} style={{ color }}>
      {children}
    </Link>
  );
}