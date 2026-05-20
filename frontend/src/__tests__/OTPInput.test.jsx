import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OTPInput from "../components/OTPInput";

describe("OTPInput", () => {
  it("renders one input box per digit", () => {
    render(<OTPInput length={6} value="" onChange={() => {}} autoFocus={false} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("reports the typed digit through onChange", () => {
    const onChange = vi.fn();
    render(<OTPInput length={4} value="" onChange={onChange} autoFocus={false} />);
    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "5" },
    });
    expect(onChange).toHaveBeenCalledWith("5");
  });

  it("ignores non-numeric input", () => {
    const onChange = vi.fn();
    render(<OTPInput length={4} value="" onChange={onChange} autoFocus={false} />);
    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "a" },
    });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("renders the provided value across boxes", () => {
    render(<OTPInput length={4} value="12" onChange={() => {}} autoFocus={false} />);
    const boxes = screen.getAllByRole("textbox");
    expect(boxes[0]).toHaveValue("1");
    expect(boxes[1]).toHaveValue("2");
    expect(boxes[2]).toHaveValue("");
  });
});
