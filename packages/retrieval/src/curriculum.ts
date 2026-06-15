// Maps the contract's curriculumFilter onto the flat `curriculumTags` column.
//
// The schema has no separate board/level/spec columns — only `curriculumTags
// String[]` (GIN-indexed). So board / level / specCode are required tags
// (containment, @>) and topicTags is overlap (&&). Both operators use the GIN
// index. An empty / undefined filter yields `TRUE` so it can be AND-ed
// unconditionally into a WHERE clause. Every tag value is a BOUND parameter.
import { Prisma } from '@imaia/db';
import type { RetrievalQuery } from '@imaia/contracts';

export function curriculumWhere(filter: RetrievalQuery['curriculumFilter']): Prisma.Sql {
  if (!filter) return Prisma.sql`TRUE`;

  const parts: Prisma.Sql[] = [];
  if (filter.board) {
    parts.push(Prisma.sql`"curriculumTags" @> ARRAY[${filter.board}]::text[]`);
  }
  if (filter.level) {
    parts.push(Prisma.sql`"curriculumTags" @> ARRAY[${filter.level}]::text[]`);
  }
  if (filter.specCode) {
    parts.push(Prisma.sql`"curriculumTags" @> ARRAY[${filter.specCode}]::text[]`);
  }
  if (filter.topicTags && filter.topicTags.length > 0) {
    parts.push(Prisma.sql`"curriculumTags" && ARRAY[${Prisma.join(filter.topicTags)}]::text[]`);
  }

  return parts.length > 0 ? Prisma.join(parts, ' AND ') : Prisma.sql`TRUE`;
}
