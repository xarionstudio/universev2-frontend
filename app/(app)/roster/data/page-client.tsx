"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Eye, Search, Upload } from "lucide-react";

import { rosterMeta } from "@/lib/data/roster";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FootSum,
  PageTitle,
  Panel,
  PanelFoot,
  Toolbar,
  ToolbarGroup,
  ToolbarTitle,
} from "@/components/ui/panel";
import { SearchInput } from "@/components/ui/search-input";
import { StateBox } from "@/components/ui/state-box";
import {
  NameCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

export default function RosterDataPage() {
  const { t, lang } = useI18n();
  const { pushToast } = useToast();
  const router = useRouter();

  const [date, setDate] = React.useState("");
  const [q, setQ] = React.useState("");

  const rows = rosterMeta(lang).filter((r) => {
    if (date && r.month !== date.slice(0, 7)) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      r.label.toLowerCase().includes(needle) ||
      r.file.toLowerCase().includes(needle) ||
      r.by.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={t.navRD} sub={t.rdSub}>
        <Button onClick={() => router.push("/roster/upload")}>
          <Upload />
          {t.rdUpload}
        </Button>
      </PageTitle>

      <Panel>
        <Toolbar>
          <ToolbarTitle>{t.rdListTitle}</ToolbarTitle>
          <ToolbarGroup>
            <div className="flex items-center gap-2">
              <label
                htmlFor="rd-tgl"
                className="text-xs text-(--text-tertiary)"
              >
                {t.lblDate}
              </label>
              <Input
                id="rd-tgl"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-[170px] font-mono"
              />
            </div>
            <SearchInput
              className="w-[250px]"
              placeholder={t.rdSearchPh}
              aria-label={t.rdSearchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </ToolbarGroup>
        </Toolbar>

        {rows.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>{t.thPeriod}</TableHead>
                <TableHead className="max-xl:hidden">{t.thUploaded}</TableHead>
                <TableHead>{t.thEmpN}</TableHead>
                <TableHead>{t.thRows}</TableHead>
                <TableHead>{t.thStatus}</TableHead>
                <TableHead>{t.thAct}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>
                    <NameCell name={r.label} sub={r.file} />
                  </TableCell>
                  <TableCell className="max-xl:hidden">
                    <NameCell
                      name={<span className="font-medium">{r.by}</span>}
                      sub={r.date}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{r.emp}</TableCell>
                  <TableCell className="font-mono">{r.rows}</TableCell>
                  <TableCell>
                    <Badge
                      variant={r.status === "aktif" ? "success" : "neutral"}
                      dot
                    >
                      {r.status === "aktif" ? t.stAktif : t.stArsip}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/roster/attendance?date=${r.dateISO}`}
                        className="text-sm whitespace-nowrap"
                      >
                        {t.rdView}
                      </Link>
                      <IconButton
                        aria-label={t.rdDetail}
                        onClick={() => router.push(`/roster/detail?p=${r.key}`)}
                      >
                        <Eye />
                      </IconButton>
                      <IconButton
                        aria-label={t.rdDl}
                        onClick={() => pushToast("success", t.rdDlT, r.file)}
                      >
                        <Download />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <StateBox
            icon={<Search className="text-(--color-primary-bright)" />}
            title={t.noResTitle}
            body={t.rdEmptyB}
          />
        )}

        <PanelFoot>
          <FootSum>
            {t.rdSumA} <b>{rows.length}</b> {t.rdSumB}
          </FootSum>
        </PanelFoot>
      </Panel>
    </div>
  );
}
