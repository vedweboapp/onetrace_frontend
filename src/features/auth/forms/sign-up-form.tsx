import { useTranslations } from 'next-intl'

const SignUpForm = () => {
  const t = useTranslations("Auth.signUpForm")
  const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/8"
  return (
    <form className='space-y-4'>
      <div className='flex items-center justify-center gap-3'>
        <h1 className="text-slate-900 text-3xl font-bold">
        {t("title")}
        </h1>
      </div>
      <div className=" w-full bg-white rounded-lg  border-t-slate-900 border-t-4 rounded- p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="" className="text-">{t("firstName")}</label>
          <input type="text" className={inputClass} placeholder="Enter First Name"/>
        </div>
        <div className="space-y-2">
          <label htmlFor="" className="">{t("middleName")}<span className="text-slate-400 text-md">{t("optional")}</span></label>
          <input type="text" className={inputClass} placeholder="Enter Middle Name" />

        </div>
      </div>
      <div>
        <label htmlFor="">{t("lastName")}</label>
        <input type="text" className={inputClass}  placeholder="Enter Last Name"/>
      </div>
      <div>
        <label htmlFor="">{t("email")}</label>
      </div>
      </div>
    </form>
  )
}

export default SignUpForm
