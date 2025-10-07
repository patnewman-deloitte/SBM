import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { type Segment } from '../data/seeds';
import { currencyFormatter, formatPayback } from '../lib/format';
import { summariseCohort } from '../sim/tinySim';

interface CompareDrawerProps {
  open: boolean;
  onClose: () => void;
  segments: Segment[];
}

export const CompareDrawer = ({ open, onClose, segments }: CompareDrawerProps) => {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="pointer-events-auto w-screen max-w-3xl bg-white shadow-xl">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <Dialog.Title className="text-lg font-semibold text-slate-900">Compare segments</Dialog.Title>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="grid gap-6">
                      {segments.map((segment) => {
                        const summary = summariseCohort(segment);
                        return (
                          <div key={segment.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">{segment.name}</h3>
                                <p className="text-sm text-slate-600">{segment.notes}</p>
                              </div>
                              <div className="text-right text-sm text-slate-500">
                                <p>Size: {segment.size.toLocaleString()}</p>
                                <p>Growth: {(segment.growthRate * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                            <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
                              <div className="rounded-xl bg-white p-4 shadow-inner">
                                <dt className="font-medium text-slate-500">CAC Payback</dt>
                                <dd className="mt-1 text-lg font-semibold text-slate-900">{formatPayback(summary.paybackMonths)}</dd>
                              </div>
                              <div className="rounded-xl bg-white p-4 shadow-inner">
                                <dt className="font-medium text-slate-500">12-mo Margin</dt>
                                <dd className="mt-1 text-lg font-semibold text-slate-900">{currencyFormatter.format(summary.grossMargin12Mo)}</dd>
                              </div>
                              <div className="rounded-xl bg-white p-4 shadow-inner">
                                <dt className="font-medium text-slate-500">Net Adds est.</dt>
                                <dd className="mt-1 text-lg font-semibold text-slate-900">{summary.netAdds.toLocaleString()}</dd>
                              </div>
                            </dl>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
