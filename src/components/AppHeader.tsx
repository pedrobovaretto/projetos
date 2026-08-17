import { Menu } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { ExportDialog } from "./ExportDialog";
import { NavLink } from "./NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const links = [
  { to: "/", label: "Início", end: true },
  { to: "/produtos", label: "Produtos" },
  { to: "/movimentacoes", label: "Movimentações" },
  { to: "/locais-estoque", label: "Locais de Estoque" },
];

const linkBase =
  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted";
const linkActive = "bg-leaf-soft text-leaf hover:bg-leaf-soft hover:text-leaf";

export const AppHeader = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
      <div className="container flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Domingos Bovaretto" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <p className="font-serif text-lg font-semibold tracking-tight text-foreground">
              Domingos Bovaretto
            </p>
            <p className="text-xs text-muted-foreground">Controle de estoque interno</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={linkBase}
              activeClassName={linkActive}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ExportDialog />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-serif">Navegação</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    onClick={() => setOpen(false)}
                    className={linkBase}
                    activeClassName={linkActive}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
