import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const CommonForm = ({
  formControls,
  formData,
  setFormData,
  onSubmit,
  errors = {},
  setErrors,
  buttonText,
}) => {
  // Hàm render input dựa vào componentType
  function renderInputsByComponentType(control) {
    const value = formData[control.name] ?? ""; // luôn lấy từ formData
    const errorMessage = errors[control.name];

    switch (control.componentType) {
      case "input":
        return (
          <div className="space-y-1">
            <Label htmlFor={control.name}>{control.label}</Label>
            <Input
              id={control.name}
              name={control.name}
              type={control.type || "text"}
              placeholder={control.placeholder}
              value={value} // controlled
              onChange={(e) => {
                setFormData({ ...formData, [control.name]: e.target.value });
                if (errorMessage) {
                  setErrors({ ...errors, [control.name]: undefined });
                }
              }}
            />
            {errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-1">
            <Label htmlFor={control.name}>{control.label}</Label>
            <Textarea
              id={control.name}
              name={control.name}
              placeholder={control.placeholder}
              value={value} // controlled
              onChange={(e) => {
                setFormData({ ...formData, [control.name]: e.target.value });
                if (errorMessage) {
                  setErrors({ ...errors, [control.name]: undefined });
                }
              }}
            />
            {errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case "select":
        return (
          <div className="space-y-1">
            <Label>{control.label}</Label>
            <Select
              value={value} // controlled
              onValueChange={(val) => {
                setFormData({ ...formData, [control.name]: val });
                if (errorMessage) {
                  setErrors({ ...errors, [control.name]: undefined });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={control.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {control.options?.map((option, i) => (
                  <SelectItem key={i} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formControls.map((control, i) => (
        <div key={i}>{renderInputsByComponentType(control)}</div>
      ))}
      <Button type="submit" className="w-full">
        {buttonText}
      </Button>
    </form>
  );
};

export default CommonForm;
