import gitamLogo from 'figma:asset/d0993f631e9784eec0c2aa765ebd21d9da4d235b.png';

export function GitamLogo({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <img
      src={gitamLogo}
      alt="GITAM University Logo"
      className={`${className} object-contain bg-transparent border-0 shadow-none`}
    />
  );
}