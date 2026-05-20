import React, { ReactNode } from 'react'

const FormSectionCard = ({ title, icon, children }: { title: string, icon: ReactNode, children: ReactNode }) => {
  return (
    <div className='flex flex-col gap-4 w-full border border-gray-200 rounded-lg shadow-sm p-6 bg-white dark:bg-slate-800 dark:border-slate-600'>
      <div className='flex items-center gap-4'>
        <div className='p-1.5 rounded-full bg-gray-200 p-2 text-primary'>
          {icon}
        </div>
        <h1 className='text-xl font-bold'>{title}</h1>
      </div>
      {children}
    </div>
  )
}

export default FormSectionCard;