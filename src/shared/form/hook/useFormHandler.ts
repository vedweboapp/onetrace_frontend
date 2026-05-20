import { useRef, useState, FormEvent } from 'react';

export interface UseFormHandlerOptions {
  changesOnly?: boolean;
}

export interface FormRefMethods {
  getChangedData: () => any;
  getFormData: () => any;
  submit: (onValid: (data?: any) => void, onInvalid?: (errors: any) => void) => () => void;
  reset: (values?: any) => void;
}

export const useFormHandler = <T = any>(
  onSubmit: (data: T) => Promise<void> | void,
  options: UseFormHandlerOptions = {}
) => {
  const { changesOnly = false } = options;
  const formRef = useRef<FormRefMethods>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault(); // Prevent default form submission (page refresh)
    }

    try {
      setIsLoading(true);
      setError(null);

      if (!formRef.current) {
        throw new Error("Form reference is not attached");
      }

      // Choose method based on option
      const submitMethod = changesOnly ? formRef.current.getChangedData : formRef.current.getFormData;

      formRef.current.submit(
        async (_) => {
          const dataToSubmit = submitMethod();
          console.log('Form is valid. Submitting data:', dataToSubmit);

          // Call the callback with prepared data
          if (onSubmit) {
            await onSubmit(dataToSubmit);
          }
        },
        (validationErrors) => {
          console.log('Form validation errors:', validationErrors);
          setError('Validation failed');
        }
      )();

    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    try {
      if (formRef.current) {
        formRef.current.reset();
      }
      setError(null);
    } catch (err) {
      console.error('Form reset error:', err);
    }
  };

  return {
    formRef,
    isLoading,
    error,
    handleSubmit,
    handleReset,
  };
};

export default useFormHandler;