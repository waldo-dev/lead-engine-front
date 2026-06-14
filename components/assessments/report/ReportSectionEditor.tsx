"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REPORT_SECTIONS } from "@/components/assessments/constants";
import type { ChilSmartReport } from "@/types/assessment";

interface ReportSectionEditorProps {
  reportData: ChilSmartReport;
  disabled?: boolean;
  onPatch: (sectionKey: string, value: unknown) => void;
}

export function ReportSectionEditor({
  reportData,
  disabled,
  onPatch,
}: ReportSectionEditorProps) {
  const [activeSection, setActiveSection] = useState<string>(REPORT_SECTIONS[0].key);
  const [editText, setEditText] = useState<string | null>(null);

  const sectionValue = reportData[activeSection as keyof ChilSmartReport];
  const jsonText = editText ?? JSON.stringify(sectionValue ?? {}, null, 2);

  const handleSectionChange = (section: string) => {
    setEditText(null);
    setActiveSection(section);
  };

  const handleBlur = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onPatch(activeSection, parsed);
      setEditText(null);
    } catch {
      setEditText(jsonText);
    }
  };

  return (
    <Tabs value={activeSection} onValueChange={handleSectionChange}>
      <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
        {REPORT_SECTIONS.map((s) => (
          <TabsTrigger
            key={s.key}
            value={s.key}
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={activeSection} className="mt-4">
        <Textarea
          rows={16}
          disabled={disabled}
          className="font-mono text-xs"
          value={jsonText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Edita el JSON de la sección. Los cambios se guardan al salir del campo.
        </p>
      </TabsContent>
    </Tabs>
  );
}
