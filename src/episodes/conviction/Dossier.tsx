// 인물 파일 (01~05 인물소개서). full 이면 나만 아는 정보·개인 기록·개인 목표까지 보여 준다.
import { portrait, type Role } from './data';

export function Dossier({ role, full }: { role: Role; full?: boolean }) {
  const p = role.profile;
  return (
    <article className="cv-dossier">
      <header>
        <img className="cv-face" src={portrait(role.id)} alt="" />
        <span className="cv-kicker">{role.file}</span>
        <h3>{role.name} <small>{role.title}</small></h3>
        <dl>
          <dt>생년월일</dt><dd>{p.born}</dd>
          <dt>국적</dt><dd>{p.nation}</dd>
          <dt>직업</dt><dd>{p.job}</dd>
          <dt>배우자</dt><dd>{p.spouse}</dd>
        </dl>
      </header>
      <section>
        <h4>외부에 알려진 정보</h4>
        {role.known.map((t) => <p key={t}>{t}</p>)}
      </section>
      {full && (
        <>
          <section className="secret">
            <h4>나만 아는 정보</h4>
            {role.secret.map((t) => <p key={t}>{t}</p>)}
          </section>
          {role.record && (
            <section>
              <h4>개인 기록</h4>
              <blockquote>“{role.record.quote}”</blockquote>
              {role.record.text.map((t) => <p key={t}>{t}</p>)}
            </section>
          )}
          <section>
            <h4>개인 목표</h4>
            <ol>{role.goals.map((g) => <li key={g}>{g}</li>)}</ol>
          </section>
        </>
      )}
    </article>
  );
}
