import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, DataTable, type Column } from "./index";

describe("Button", () => {
  it("renders its label and forwards attributes", () => {
    const html = renderToStaticMarkup(
      <Button variant="ghost" type="submit" aria-label="go">
        Click me
      </Button>,
    );
    expect(html).toContain("<button");
    expect(html).toContain("Click me");
    expect(html).toContain('type="submit"');
    expect(html).toContain('aria-label="go"');
  });
});

interface Row {
  id: string;
  name: string;
}
const columns: Array<Column<Row>> = [
  { key: "name", header: "Name", render: (r) => r.name },
  { key: "id", header: "ID", render: (r) => r.id, align: "right" },
];

describe("DataTable", () => {
  it("renders accessible headers and rows", () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={[{ id: "1", name: "Ada" }]} getRowKey={(r) => r.id} />,
    );
    expect(html).toContain('scope="col"');
    expect(html).toContain("Name");
    expect(html).toContain("Ada");
    expect(html).toContain("<table");
  });

  it("renders the empty state when there are no rows", () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={[]} getRowKey={(r) => r.id} empty="Nothing here" />,
    );
    expect(html).toContain("Nothing here");
    expect(html).not.toContain("<table");
  });
});
