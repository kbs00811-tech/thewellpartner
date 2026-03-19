/**
 * 페이지 전환 시 표시되는 Skeleton 로딩 UI
 * PageHero + 콘텐츠 영역 스켈레톤
 */

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen" role="status" aria-busy="true" aria-label="페이지 로딩 중">
      {/* Hero skeleton */}
      <div className="pt-36 pb-20" style={{ background: "linear-gradient(165deg, var(--brand-hero-from), var(--brand-hero-to))" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="animate-pulse">
            <div className="w-24 h-4 bg-white/10 rounded mb-4" />
            <div className="w-80 h-10 bg-white/10 rounded mb-4" />
            <div className="w-64 h-5 bg-white/10 rounded" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Pulse className="w-full h-48" />
              <Pulse className="w-3/4 h-5" />
              <Pulse className="w-1/2 h-4" />
            </div>
          ))}
        </div>
        <div className="mt-16 space-y-4">
          <Pulse className="w-48 h-7" />
          <Pulse className="w-full h-4" />
          <Pulse className="w-full h-4" />
          <Pulse className="w-3/4 h-4" />
        </div>
      </div>
    </div>
  );
}

/** 카드 리스트 스켈레톤 (채용, 공지사항 등에 활용) */
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse border border-gray-100 rounded-xl p-5 flex gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-3/4 h-5 bg-gray-200 rounded" />
            <div className="w-1/2 h-4 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 테이블 스켈레톤 (어드민 목록 등에 활용) */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse" role="status" aria-busy="true" aria-label="테이블 로딩 중">
      <div className="flex gap-4 pb-3 border-b border-gray-100 mb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 h-4 bg-gray-200 rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4 py-3 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, ci) => (
            <div key={ci} className="flex-1 h-4 bg-gray-100 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}
